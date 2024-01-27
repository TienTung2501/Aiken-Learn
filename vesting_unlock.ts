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
 
// --- Supporting functions
 
async function readValidator(): Promise<SpendingValidator> {
  const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[1];
  return {
    type: "PlutusV2",
    script: toHex(cbor.encode(fromHex(validator.compiledCode))),
  };
}
// ^^^ Code above is unchanged. ^^^
 
const scriptAddress = lucid.utils.validatorToAddress(validator);// địa chỉ hợp đồng thông minh
// we get all the UTXOs sitting at the script address
const scriptUtxos = await lucid.utxosAt(scriptAddress);// đọc các utxo trong hợp đồng
//Bạn đang nhận được tất cả đầu ra giao dịch chưa chi tiêu (UTXO) tại địa chỉ tương ứng với trình xác thực hợp đồng thông minh.
const Datum = Data.Object({
  lock_until: typeof Data.BigInt, // this is POSIX time, you can check and set it here: https://www.unixtimestamp.com
  owner: typeof Data.String, // we can pass owner's verification key hash as byte array but also as a string
  beneficiary: typeof Data.String, // we can beneficiary's hash as byte array but also as a string
});
type Datum = Data.Static<typeof Datum>;
//const currentTime = new Date().getTime();
const currentTime= new Date().getTime();

// we filter out all the UTXOs by beneficiary and lock_until
const utxos = scriptUtxos.filter((utxo) => {
  let datum = Data.from<Datum>(
    utxo.datum,
    Datum,
  );
  
  // console.log(datum.lock_until);
  console.log(datum.beneficiary);
  console.log(beneficiaryPublicKeyHash);
  console.log(datum.beneficiary === beneficiaryPublicKeyHash &&
  datum.lock_until <= currentTime);
// utxos sẽ chứa các utxo thỏa mãn 2 điều kiện đó là  utxo này cho người thụ hưởng và thời gian khóa hợp đồng nhỏ hơn hoặc bằng thời gian hiện tại
  return datum.beneficiary === beneficiaryPublicKeyHash &&
    datum.lock_until <= currentTime;
    
});
//console.log(utxos);
if (utxos.length === 0) {
  console.log("No redeemable utxo found. You need to wait a little longer...");
  Deno.exit(1);
}
// we don't have any redeemer in our contract but it needs to be empty
const redeemer = Data.void();// không cần sử dụng redeemer

const txUnlock = await unlock(utxos, currentTime, { from: validator, using: redeemer });
console.log(3);
await lucid.awaitTx(txUnlock);
 
console.log(`20 tADA recovered from the contract
    Tx ID: ${txUnlock}
    Redeemer: ${redeemer}
`);
 
// --- Supporting functions

async function unlock(utxos, currentTime, { from, using }): Promise<TxHash> {
  const laterTime =  new Date(currentTime + 2 * 60 * 60 * 1000).getTime();
  console.log(currentTime);
  console.log(laterTime);
    const tx = await lucid
      .newTx()
      .collectFrom(utxos, using)
      .addSigner(await lucid.wallet.address())
      .validFrom(currentTime)
      .validTo(laterTime)
      .attachSpendingValidator(from)
      .complete();

    const signedTx = await tx
      .sign()
      .complete();

    return signedTx.submit();
  
}
// chốt lại lock_until và khoảng thời gian hợp lệ:
//Khoảng thời gian hợp lệ (validFrom và validTo) trong giao dịch (tx) xác định khoảng thời gian mà giao dịch được phép để được xác thực và thêm vào blockchain.
//Khi tạo một giao dịch để chi tiêu tài sản từ một hợp đồng (như trong hàm unlock), bạn thường cần xác định khoảng thời gian mà giao dịch đó hợp lệ (validFrom và validTo).
//Trong ngữ cảnh này, bạn có thể sử dụng giá trị lock_until từ Datum làm cơ sở để xác định khoảng thời gian hợp lệ. Ví dụ, bạn có thể đặt validFrom bằng giá trị hiện tại và 
//validTo bằng giá trị lock_until, chỉ cho phép giao dịch được thực hiện khi thời gian hiện tại vượt qua giá trị lock_until.