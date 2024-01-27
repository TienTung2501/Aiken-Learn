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
  } from "https://deno.land/x/lucid@0.8.3/mod.ts";
  import * as cbor from "https://deno.land/x/cbor@v1.4.1/index.js";
   
  const lucid = await Lucid.new(
    new Blockfrost(
        "https://cardano-preview.blockfrost.io/api/v0",
        "preview5ZEeQD8I1W8MHLEwlKy7NEmXKjSPJhRZ",
    ),
    "Preview"
  );
   
  lucid.selectWalletFromPrivateKey(await Deno.readTextFile("./me.sk"));
   
  const validator = await readValidator();// khởi tạo 1 biến validator(mục đích là mô tả về hợp đồng thông minh) truyền vào hàm lock để tý sử dụng chuyển thành địa chỉ của hợp đồng thông minh
   
  // --- Supporting functions
   
  async function readValidator(): Promise<SpendingValidator> {// đọc các thông tin về validator 
    const validator = JSON.parse(await Deno.readTextFile("plutus.json"))
      .validators[0];
    return {
      type: "PlutusV2",
      script: toHex(cbor.encode(fromHex(validator.compiledCode))),
    };
  }
  const utxo: OutRef = { txHash: Deno.args[0], outputIndex: 0 };// UTXO là 1 đối tượng xác định là giao dịch chưa được sử dụng với các thông tin về  txHash của giao dịch và
 //Deno.args[0] là cách để lấy tham số dòng lệnh đầu tiên khi bạn chạy chương trình Deno. Trong trường hợp này, nó được sử dụng để lấy giá trị của txHash từ dòng lệnh. Điều này giả định rằng bạn đang chạy chương trình với một tham số trên dòng lệnh, và giá trị của tham số đó được coi là txHash.

//outputIndex: 0 chỉ định rằng chúng ta đang muốn sử dụng Unspent Transaction Output (UTXO) tại vị trí index 0 trong giao dịch có txHash tương ứng. Điều này làm cho utxo trở thành một đối tượng chứa thông tin về một Unspent Transaction Output cụ thể mà chúng ta muốn sử dụng trong quá trình giao dịch.
const redeemer = Data.to(new Constr(0, [utf8ToHex("Hello, World!")]));// đây là một thông điệp xác thực
 
const txHash = await unlock(utxo, {
  from: validator,
  using: redeemer,
});// unlock là 1 giao dịch mở khóa tài sản từ hợp đồng thông minh và trả ada về địa chỉ ví 1 người và hàm này trả về 1 txHash của giao dịch
 
await lucid.awaitTx(txHash);// thực hiện giao dịch
 
console.log(`1 tADA unlocked from the contract
    Tx ID:    ${txHash}
    Redeemer: ${redeemer}
`);
 
// --- Supporting functions
 //Hàm unlock được thiết kế để thực hiện quy trình "unlock" trên blockchain Cardano, tức là chi tiêu (spend) 
 //một Unspent Transaction Output (UTXO) từ một hợp đồng thông minh, sử dụng một Redeemer. 
 //Dưới đây là giải thích chi tiết từng bước trong hàm:
async function unlock(
  ref: OutRef,
  { from, using }: { from: SpendingValidator; using: Redeemer }
): Promise<TxHash> {
  const [utxo] = await lucid.utxosByOutRef([ref]);// chưa hiển lắm về utxo ở đây là gì?
  //Sử dụng lucid.utxosByOutRef() để lấy thông tin về một hoặc nhiều UTXOs dựa trên OutRef được truyền vào hàm. 
  //Trong trường hợp này, chỉ có một UTXO được truyền vào mảng, nên [utxo] giữ thông tin về UTXO đó.
 
  const tx = await lucid
    .newTx()
    .collectFrom([utxo], using)//được sử dụng để xác định UTXO mà chúng ta muốn sử dụng trong giao dịch và Redeemer (using) để thiết lập điều kiện chi tiêu của giao dịch.
    .addSigner(await lucid.wallet.address())//thêm chữ ký từ địa chỉ ví của bạn vào giao dịch.
    .attachSpendingValidator(from)//kết nối thông tin SpendingValidator (from) với giao dịch.
    .complete();
 
  const signedTx = await tx
    .sign()
    .complete();
 
  return signedTx.submit();
}
// các thao tác để mở khóa 1 giao dịch:
// B1: Tạo ví, đọc lấy địa chỉ ví
//B2: Khởi tạo validator (cái này để lấy thông tin của hợp đồng thông minh)
//B3: Khởi tạo utxo cho giao dịch unlock utxo này là một đầu ra giao dịch chưa sử dụng nhằm mục đích là đầu vào cho 1 giao dịch
//B4: Tạo txHash được trả về từ unlock với các tham số utxo, from validator, sử dụng điều kiện xác thực là redeemer
//B5: Đợi giao dịch hoàn thành.