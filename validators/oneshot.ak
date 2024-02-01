use aiken/dict
use aiken/list
use aiken/transaction.{OutputReference, ScriptContext, Transaction} as tx
use aiken/transaction/value
type Action{
    Mint
    Burn
}// định nghĩa action
validator(token_name: ByteArray, utxo_ref: OutputReference){// tạo một xác thực sử dụng để mint and burn
    fn gift_card(rdmr: Action, ctx: ScriptContext)-> Bool{
        let ScriptContext {transaction, purpose} =ctx// Gán giá trị của transaction và purpose từ ctx vào các biến tương ứng.
        expect tx.Mint(policy_id)=purpose// Kiểm tra nếu mục đích của giao dịch là Mint và policy_id của token trùng khớp với purpose
        let Transaction { inputs, mint, ..} = transaction // Gán giá trị của inputs và mint từ transaction vào các biến tương ứng.
        expect [(asset_name,amount)]=//ấy giá trị của asset_name và amount từ phần mint của giao dịch.
            mint// mint là đối số của hàm dưới
            |>value.from_minted_value// kết quả trả về của hàm này là đối số của hàm dưới
            |>value.tokens(policy_id)// kết quả của hàm này là đối số của hàm dưới cùng
            |>dict.to_list()
        when rdmr is{
            Mint ->{
                expect True = //Nếu rdmr là Mint: Kiểm tra xem có input nào của giao dịch trùng với utxo_ref hay không, và kiểm tra giá trị amount và asset_name.
                list.any(inputs,fn(input){ input.output_reference==utxo_ref})
                amount==1&&asset_name==token_name
            }
            Burn ->
                amount == -1 && asset_name == token_name//Nếu rdmr là Burn: Kiểm tra giá trị amount và asset_name.
        }
    }
}
validator (token_name: ByteArray, policy_id: ByteArray){// đây là trình xác thực để đốt cháy tài sản
    fn redeem(_d: Data, _: Data, ctx: ScriptContext ) -> Bool{
        let ScriptContext { transaction, .. } = ctx// lấy các giá trị transaction trong ctx gán vào cho transaction
 
    let Transaction { mint, .. } = transaction// lấy giá trị của mint trong transaction gán vào cho mint
 
    expect [(asset_name, amount)] =// Lấy giá trị của asset_name và amount từ phần mint của giao dịch.
        mint
            |> value.from_minted_value
            |> value.tokens(policy_id)
            |> dict.to_list()
        amount == -1 && asset_name == token_name//Kiểm tra giá trị amount và asset_name để đảm bảo rằng đây là một giao dịch đốt cháy token.
    }
}