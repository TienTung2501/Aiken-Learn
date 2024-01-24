use aiken/hash.{Blake2b_224, Hash}
use aiken/list
use aiken/string
use aiken/transaction/credential.{VerificationKey}
use aiken/transaction.{
  OutputReference, ScriptContext, Spend, Transaction, TransactionId,
}
// Khai báo Datum 
type Datum {
  owner: Hash<Blake2b_224, VerificationKey>,
}
// khai bá redemer
type Redeemer {
  msg: ByteArray,
}
// validator là một trình xác thực trên chuỗi nó chứa các hàm xác thực được định nghĩa bởi lập trình viên và trả về giá trị true,false
validator {
  // truyền các tham số datum,redeemer,context vào hàm xác thực hello_world
  fn hello_world(datum: Datum, redeemer: Redeemer, context: ScriptContext) -> Bool {
    trace string.from_bytearray(redeemer.msg)// thêm dấu vết để truy vết khi thực thi nếu có lỗi
    let must_say_hello = // khởi tạo biến để xác thực điều kiện cho trình giao dịch
      redeemer.msg == "Hello, World!"
   
    let must_be_signed =//kiểm tra xem context có chứa dữ liệu thông tin của người tạo hay không?
      list.has(context.transaction.extra_signatories, datum.owner)
 
     must_say_hello? && must_be_signed?// đây là biểu thức trả về kết quả true false cuối cùng cho hàm xác thực nếu nó trả về true tức là xác thực thành công
     // lý do thêm ? ở sau mỗi biến là để truy vết nếu xảy ra lỗi
  }
}
// hàm test kiểm trả
test hello_world_example() {
  let datum =// khởi tạo giá trị thông tin người dùng
    Datum { owner: #"00000000000000000000000000000000000000000000000000000000" }
  // khởi tạo thông điệp điều kiện
    let redeemer =
    Redeemer { msg: "Hello, World!" }
 
  let placeholder_utxo =//là một biến được định nghĩa để đại diện cho một đầu ra của giao dịch (UTxO) giả mạo (placeholder).
    OutputReference { transaction_id: TransactionId(""), output_index: 0 }
    //OutputReference là một cấu trúc dữ liệu trong Plutus để mô tả một đầu ra của giao dịch (UTxO). Trong trường hợp này, bạn đang tạo một UTxO với transaction_id là một chuỗi rỗng ("") và output_index là 0.
 
  let context =//context là một biến kiểu ScriptContext. ScriptContext là một trong những thành phần chính khi xây dựng smart contract trên Cardano.
    ScriptContext {
      purpose: Spend(placeholder_utxo),//purpose: Spend(placeholder_utxo): Bạn đang đặt mục đích của context là để chi tiêu (Spend) UTxO được đại diện bởi placeholder_utxo. 
      //Điều này là phổ biến trong smart contract khi bạn muốn chỉ ra rằng giao dịch của bạn đang sử dụng một UTxO cụ thể.
      transaction: transaction.placeholder()// xây dụng 1 giao dịch(transaction) bằng cách sử dụng
        |> fn(transaction) {//Lưu ý rằng tại thời điểm này, chúng tôi không cung cấp bất kỳ chữ ký nào. Điều này là do chúng tôi không thực hiện bất kỳ xác nhận giai đoạn 1 nào của sổ cái. 
        //Tuy nhiên, trước khi thực hiện hợp đồng thông minh, sổ cái sẽ xác minh rằng nội dung giao dịch là hợp lệ. Đặc biệt, nó sẽ xác minh rằng mọi extra_signatories đều có chữ ký hợp lệ tương ứng trong giao dịch. Ở đây, chúng ta chỉ cần sử dụng khóa xác minh giữ chỗ của mình!
             Transaction { ..transaction, extra_signatories: [datum.owner] }
           }
    }
 
  hello_world(datum, redeemer, context)
}