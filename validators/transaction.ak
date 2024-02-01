use aiken/hash.{Blake2b_224, Hash}
use aiken/list
use aiken/transaction/credential.{VerificationKey}
use aiken/transaction.{
   ScriptContext, Spend, Transaction
}
use aiken/transaction/value.{ PolicyId, AssetName}
type VerificationKeyHash= // mã hash xác thực của địa chỉ của người gửi và người thụ hưởng
    Hash<Blake2b_224,VerificationKey>
type Datum {
  //policyId
  policyId: PolicyId,
  asset_name: AssetName,
  /// Owner's credentials
  owner: VerificationKeyHash,
  /// Beneficiary's credentials
  beneficiary: VerificationKeyHash,
}
validator{
    fn transaction(datum: Datum, _redeemer: Void, ctx: ScriptContext){
        // Về nguyên tắc(in principle), tập lệnh(scripts) có thể được sử dụng cho nhiều mục đích khác nhau (ví dụ: đúc tài sản). Ở đây chúng tôi đảm bảo rằng nó chỉ được sử dụng khi 'chi tiêu' từ eUTxO
        // In principle, scripts can be used for different purpose (e.g. minting
        // assets). Here we make sure it's only used when 'spending' from a eUTxO
        when ctx.purpose is{
            Spend(_)->
            or // dùng or vì có thể lấy 1 giá trị đúng trong các biểu thức logic
            {
                must_be_signed_by(ctx.transaction,datum.owner)?,
                must_be_signed_by(ctx.transaction,datum.beneficiary),// kí bởi người thụ hưởng
            }
            _ -> False
        }
    }
}
fn must_be_signed_by(transaction: Transaction, vk: VerificationKeyHash){
    list.has(transaction.extra_signatories,vk)
}