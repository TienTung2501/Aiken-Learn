use aiken/hash.{Blake2b_224,Hash}
use aiken/transaction/credential.{VerificationKey}
use aiken/interval.{Finite}
use aiken/list
use aiken/transaction.{Transaction,ScriptContext,Spend,ValidityRange}
type Datum {
  /// POSIX time in second, e.g. 1672843961000
  lock_until: POSIXTime,
  /// Owner's credentials
  owner: VerificationKeyHash,
  /// Beneficiary's credentials
  beneficiary: VerificationKeyHash,
}
type VerificationKeyHash= // mã hash xác thực của địa chỉ của người gửi và người thụ hưởng
    Hash<Blake2b_224,VerificationKey>
type POSIXTime=Int
// Như chúng ta có thể thấy, dữ liệu của tập lệnh đóng vai trò là cấu hình 
// và chứa các tham số khác nhau cho hoạt động trao quyền của chúng ta. 
// Hãy nhớ rằng những yếu tố này được thiết lập khi khóa tiền trong hợp đồng; 
// kết hợp với kịch bản, chúng xác định các điều kiện để có thể giải ngân tiền.
validator{
    fn vesting(datum: Datum, _redeemer: Void, ctx: ScriptContext){
        // Về nguyên tắc(in principle), tập lệnh(scripts) có thể được sử dụng cho nhiều mục đích khác nhau (ví dụ: đúc tài sản). Ở đây chúng tôi đảm bảo rằng nó chỉ được sử dụng khi 'chi tiêu' từ eUTxO
        // In principle, scripts can be used for different purpose (e.g. minting
        // assets). Here we make sure it's only used when 'spending' from a eUTxO
        when ctx.purpose is{
            Spend(_)->
            or // dùng or vì có thể lấy 1 giá trị đúng trong các biểu thức logic
            {
                must_be_signed_by(ctx.transaction,datum.owner),
                and // tích logic của 2 trường hợp này trả về true
                {
                    must_be_signed_by(ctx.transaction,datum.beneficiary),// kí bởi người thụ hưởng
                    must_start_after(ctx.transaction.validity_range,datum.lock_until),// thời gian sau khoảng thời gian đã ràng buộc
                },
            }
            _ -> False
        }
    }
}
fn must_be_signed_by(transaction: Transaction, vk: VerificationKeyHash){
    list.has(transaction.extra_signatories,vk)
}
// khoảng thời gian hợp lệ là khoảng thời gian hiệu lực của hợp đồng sau khi hợp đồng được khóa
fn must_start_after(range: ValidityRange, lock_expiration_time: POSIXTime){////lock_expiration_time là thời điểm hết hạn của hợp đồng.
/// Phần mã này định nghĩa hàm must_start_after để kiểm tra xem thời điểm bắt đầu của một khoảng thời gian hợp lệ (ValidityRange) có sau thời điểm hết hạn của một hợp đồng khoá không (lock_expiration_time)
    when range.lower_bound.bound_type is{// Sử dụng câu lệnh when để xác định hành động kiểm tra dựa trên loại bound_type của giới hạn dưới (lower_bound) của khoảng thời gian hợp lệ.
        Finite(tx_earliest_time)-> lock_expiration_time<=tx_earliest_time
//         Finite(tx_earliest_time) -> lock_expiration_time <= tx_earliest_time: Nếu giới hạn dưới là một thời điểm cụ thể 
//         (Finite), thì kiểm tra xem lock_expiration_time có sau thời điểm này không. 
//         Nếu đúng, hàm trả về true, ngược lại trả về false.
// _ -> false: Nếu giới hạn dưới không phải là Finite (có thể là PositiveInfinity), 
// thì hàm trả về false. Cụ thể, PositiveInfinity đại diện cho một khoảng thời gian 
// không có giới hạn dưới, vì vậy nếu nó xuất hiện, ta giả sử rằng nó
        _ -> False
    }
}
// Điểm mới lạ ở đây chủ yếu nằm ở việc kiểm tra một 
// khoảng thời gian. Trên thực tế, các giao dịch có thể 
// có khoảng thời gian hiệu lực xác định từ khi nào 
// và cho đến khi giao dịch được coi là hợp lệ. 
// Giới hạn hiệu lực được sổ cái kiểm tra 
// trước khi thực thi tập lệnh và chỉ làm như vậy nếu giới hạn là hợp pháp.

// cần hiểu : về khoảng thời gian hợp lệ, hiển lại về utxo, scriptcontext
 
test must_start_after_succeed_when_lower_bound_is_after() {
  must_start_after(interval.after(2), 1)
}
 
test must_start_after_succeed_when_lower_bound_is_equal() {
  must_start_after(interval.after(2), 2)
}
 
test must_start_after_fail_when_lower_bound_is_before() {
  !must_start_after(interval.after(2), 3)
}