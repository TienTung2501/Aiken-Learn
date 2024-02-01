import {
    Blockfrost,
    C,
    Constr,
    Data,
    Lucid,
    SpendingValidator,
    TxHash,
    fromHex,
    toHex,
    utf8ToHex,
  } from "https://deno.land/x/lucid@0.10.7/mod.ts";
  import * as cbor from "https://deno.land/x/cbor@v1.4.1/index.js";
   
  const lucid = await Lucid.new(
    new Blockfrost(
        "https://cardano-preview.blockfrost.io/api/v0",
        "preview5ZEeQD8I1W8MHLEwlKy7NEmXKjSPJhRZ",
    ),
    "Preview",
);
lucid.selectWalletFromPrivateKey(await Deno.readTextFile("./beneficiary.sk"));
 
const beneficiaryPublicKeyHash = lucid.utils.getAddressDetails(
  await lucid.wallet.address()
).paymentCredential.hash;// lấy public address của người thụ hưởng
 
const validator = await readValidator();

async function readValidator(): Promise<SpendingValidator> {
    const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[3];
    return {
      type: "PlutusV2",
      script: toHex(cbor.encode(fromHex(validator.compiledCode))),
    };
  }

  const scriptAddress = lucid.utils.validatorToAddress(validator);// địa chỉ hợp đồng thông minh

  const scriptUtxos = await lucid.utxosAt(scriptAddress);// đọc các utxo trong hợp đồng

  const Datum = Data.Object({// sửa lỗi bằng ép lại kiểu để type script có thể biết rõ được kiểu dữ liệu
    policyId: typeof Data.string, // this is POSIX time, you can check and set it here: https://www.unixtimestamp.com
    assetName:typeof Data.string,
    owner: typeof Data.String, // we can pass owner's verification key hash as byte array but also as a string
    beneficiary: typeof Data.String, // we can beneficiary's hash as byte array but also as a string
    });

    const policyId = "28db0795d7f97637a556183f251eaa51860c7e97a7f851c2534d117c";
    const assetName = "54657374205472616e73616374696f6e";
type Datum = Data.Static<typeof Datum>;

const utxos = scriptUtxos.filter((utxo) => {
  try {
      let datum = Data.from<Datum>(utxo.datum, Datum);
      console.log("UTxO Datum:", datum);  // In ra để kiểm tra dữ liệu
      console.log("Beneficiary:", datum.beneficiary);
      console.log("Policy ID:", datum.policyId);
      console.log("Asset Name:", datum.assetName);

      // utxos sẽ chứa các utxo thỏa mãn 2 điều kiện đó là  utxo này cho người thụ hưởng và thời gian khóa hợp đồng nhỏ hơn hoặc bằng thời gian hiện tại
      return datum.beneficiary === beneficiaryPublicKeyHash &&
          datum.policyId === policyId && datum.assetName === assetName;
  } catch (e) {
      console.error("Error deserializing Datum:", e);
      return false; // That UTxO is not selected
  }
});
  if (utxos.length === 0) {
    console.log("No redeemable utxo found. You need to wait a little longer...");
    Deno.exit(1);
  }
console.log(1)
const redeemer = Data.void();// không cần sử dụng redeemer
console.log(2);
const txUnlock = await unlock(utxos, { from: validator, using: redeemer });
console.log(3);
await lucid.awaitTx(txUnlock);

console.log(`NFT recovered from the contract
    Tx ID: ${txUnlock}
    Redeemer: ${redeemer}
`);

async function unlock(utxos, { from, using }): Promise<TxHash> {
  const contractAddress = lucid.utils.validatorToAddress(from);
  console.log(contractAddress);
    // Initiate transaction
    console.log(4);
    const tx = await lucid
        .newTx()
        .collectFrom(utxos, using) 
        .addSigner(await lucid.wallet.address())
        .attachSpendingValidator(from) 
        .complete();
    // Sign the transaction
    const signedTx = await tx
        .sign()
        .complete();
        

    // Send transactions to onchain
    return signedTx.submit();
}
