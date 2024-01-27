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
lucid.selectWalletFromPrivateKey(await Deno.readTextFile("./me.sk"));// chọn địa chỉ ví
 
const validator = await readValidator();// đọc thông tin từ validator
 
// --- Supporting functions
 
async function readValidator(): Promise<SpendingValidator> {
  const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[0];
  return {
    type: "PlutusV2",
    script: toHex(cbor.encode(fromHex(validator.compiledCode))),// đọc mô tả về validator từ đoạn code được biên dịch lưu vào trong trong file plutus.json trả về đối tượng SpendingValidator
  };
}
const publicKeyHash = lucid.utils.getAddressDetails(
    await lucid.wallet.address()
  ).paymentCredential?.hash;// lấy địa chỉ ví đang sử dụng để lock tài sản
   
  const datum = Data.to(new Constr(0, [publicKeyHash]));// khởi tạo 1 datum và chuyển về kiểu data dùng để chỉ ra owner trong giao dịch
   
  const txHash = await lock(1000000n, { into: validator, owner: datum });// tạo txHash của giao dịch khóa tài sản
   
  await lucid.awaitTx(txHash);
   
  console.log(`1 tADA locked into the contract at:
      Tx ID: ${txHash}
      Datum: ${datum}
  `);
   
  // --- Supporting functions
   
  async function lock(
    lovelace: bigint,// into là 1 đối tượng mô tả hợp đồng thông minh
    { into, owner }: { into: SpendingValidator; owner: string }
  ): Promise<TxHash> {
    const contractAddress = lucid.utils.validatorToAddress(into);// chuyển đổi thông tin của 1 validator trong trường thành địa chỉ của validator
   
    const tx = await lucid
      .newTx()// tạo 1 giao dịch mới trên blokchain 
      .payToContract(contractAddress, { inline: owner }, { lovelace })// chuyển 1 lượng ada và hợp đồng, contractaddress là địa chỉ của hợp đồng//
      .complete();// đã hoàn thành việc giao dịch và tx chứa tất cả thông tin về giao dịch
   
    const signedTx = await tx.sign().complete();
   
    return signedTx.submit();
  }
  // để lock được thì cần có một vài tham số: địa chỉ hợp đồng, owner, lovelace, lock được coi là giao dịch trên blockchain và trả về 1 TxHash
  // các bước thực hiện lock tài sản
  //B1: Tạo chọn ví
  //B2: Tạo Validator lưu thông tin của hợp đồng thông minh
  //B3: Tạo txHash trả về từ Lock(lock là 1 hàm thực hiện giao dịch nên sẽ trả về 1 txHash)
  //B4: Gọi hàm thực hiện giao dịch await lucid.awaitTx(txHash);