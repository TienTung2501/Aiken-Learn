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

lucid.selectWalletFromPrivateKey(await Deno.readTextFile("./me.sk"));
const validator = await readValidator();


// --- Supporting functions
 
async function readValidator(): Promise<SpendingValidator> {
  const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[3];
  return {
    type: "PlutusV2",
    script: toHex(cbor.encode(fromHex(validator.compiledCode))),
  };
}
const scriptAddress = lucid.utils.validatorToAddress(validator);
const ownerPublicKeyHash = lucid.utils.getAddressDetails(
    await lucid.wallet.address()
  ).paymentCredential.hash;

const beneficiaryPublicKeyHash =
lucid.utils.getAddressDetails("addr_test1vpvk0k92hp444xeqqmuy02pt34u23mpz65x58tehtc9laesdnsfhj")
    .paymentCredential.hash;

const Datum = Data.Object({// sửa lỗi bằng ép lại kiểu để type script có thể biết rõ được kiểu dữ liệu
    policyId: typeof Data.string, // this is POSIX time, you can check and set it here: https://www.unixtimestamp.com
    assetName:typeof Data.string,
    owner: typeof Data.String, // we can pass owner's verification key hash as byte array but also as a string
    beneficiary: typeof Data.String, // we can beneficiary's hash as byte array but also as a string
    });
    const policyId = "28db0795d7f97637a556183f251eaa51860c7e97a7f851c2534d117c";
    const   assetName = "54657374205472616e73616374696f6e";
type Datum = Data.Static<typeof Datum>;

const datum = Data.to<Datum>(
    {
        policyId : policyId,
        assetName : assetName,
      //là thời điểm quyết định đến khi nào một số tài sản (có thể là loại tiền điện tử nhất định) trong hợp đồng sẽ được "khoá" và không thể chi tiêu được nữa.
        owner: ownerPublicKeyHash, // our own wallet verification key hash
        beneficiary: beneficiaryPublicKeyHash,
    },
    Datum
  );
  const NFT = policyId + assetName;
  const scriptUtxos = await lucid.utxosAt(scriptAddress);

  
  const txLock = await lock(NFT, { into: validator, datum: datum });
  await lucid.awaitTx(txLock);

  async function lock(NFT, { into, datum }): Promise<TxHash> {
    const contractAddress = lucid.utils.validatorToAddress(into);
    
    const tx = await lucid
      .newTx()
      .payToContract(contractAddress, { inline: datum }, { [NFT]:BigInt(1) })
      .complete();
   
    const signedTx = await tx.sign().complete();
   
    return signedTx.submit();
  }