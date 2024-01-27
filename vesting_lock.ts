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
  const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[1];
  return {
    type: "PlutusV2",
    script: toHex(cbor.encode(fromHex(validator.compiledCode))),
  };
}
const ownerPublicKeyHash = lucid.utils.getAddressDetails(
    await lucid.wallet.address()
  ).paymentCredential.hash;
const beneficiaryPublicKeyHash =
    lucid.utils.getAddressDetails(await Deno.readTextFile("beneficiary.addr"))
        .paymentCredential.hash;
console.log(1);
const Datum = Data.Object({// sửa lỗi bằng ép lại kiểu để type script có thể biết rõ được kiểu dữ liệu
    lock_until: typeof Data.BigInt, // this is POSIX time, you can check and set it here: https://www.unixtimestamp.com
    owner: typeof Data.String, // we can pass owner's verification key hash as byte array but also as a string
    beneficiary: typeof Data.String, // we can beneficiary's hash as byte array but also as a string
    });// định nghĩa kiểu dữ liệu Datum là một đối tượng có 3 tham số
type Datum = Data.Static<typeof Datum>;// định nghĩa kiểu dữ liệu datum là 1 kiểu tĩnh
const datum = Data.to<Datum>(
    {
      lock_until: 1706338063n, // Wed Jan 04 2023 14:52:41 GMT+0000
      //là thời điểm quyết định đến khi nào một số tài sản (có thể là loại tiền điện tử nhất định) trong hợp đồng sẽ được "khoá" và không thể chi tiêu được nữa.
      owner: ownerPublicKeyHash, // our own wallet verification key hash
      beneficiary: beneficiaryPublicKeyHash,
    },
    Datum
  );//Dòng này tạo một đối tượng datum từ kiểu Datum với giá trị cụ thể được đưa vào.
  console.log(1);
  const txLock = await lock(20000000, { into: validator, datum: datum });
 
  await lucid.awaitTx(txLock);
   
  console.log(`20 tADA locked into the contract
      Tx ID: ${txLock}
      Datum: ${datum}
  `);
   
  // --- Supporting functions
   
  async function lock(lovelace, { into, datum }): Promise<TxHash> {
    const contractAddress = lucid.utils.validatorToAddress(into);
   
    const tx = await lucid
      .newTx()
      .payToContract(contractAddress, { inline: datum }, { lovelace })
      .complete();
   
    const signedTx = await tx.sign().complete();
   
    return signedTx.submit();
  }