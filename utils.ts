import { 
  applyDoubleCborEncoding,
  applyParamsToScript,
  Constr,
  fromText,
  Lucid,
  MintingPolicy, 
  OutRef,
  SpendingValidator } from "lucid/mod.ts";
 
import blueprint from "~/plutus.json" assert { type: "json" };
 
export type Validators = {
  redeem: SpendingValidator;// xác thực sử dụng tài sản
  giftCard: MintingPolicy;// xác thực mint
};
// khởi tạo kiểu và cho phép nó được sử dụng
export function readValidators(): Validators {// export 1 hàm kiểu Validators
  const redeem = blueprint.validators.find((v) => v.title === "oneshot.redeem");// tìm kiếm trình xác thực redeem
 
  if (!redeem) {
    throw new Error("Redeem validator not found");
  }
 
  const giftCard = blueprint.validators.find(// tìm kiếm trình xác thực giftcard
    (v) => v.title === "oneshot.gift_card"
  );
 
  if (!giftCard) {
    throw new Error("Gift Card validator not found");
  }
 
  return {
    redeem: {
      type: "PlutusV2",
      script: redeem.compiledCode,
    },
    giftCard: {
      type: "PlutusV2",
      script: giftCard.compiledCode,
    },
  };
  
}

export type AppliedValidators = {
  redeem: SpendingValidator;
  giftCard: MintingPolicy;
  policyId: string;
  lockAddress: string;
};
// định nghĩa 1 type
export function applyParams(
  tokenName: string,
  outputReference: OutRef,
  validators: Validators,
  lucid: Lucid
): AppliedValidators {
  const outRef = new Constr(0, [
    new Constr(0, [outputReference.txHash]),
    BigInt(outputReference.outputIndex),
  ]);// khởi tạo các dữ liệu liên quan
 
  const giftCard = applyParamsToScript(validators.giftCard.script, [
    fromText(tokenName),
    outRef,
  ]);// biến này mô tả giftcard bao gồm thông tin mô tả về hợp đồng mint, token name, mô tả đầu ra
 
  const policyId = lucid.utils.validatorToScriptHash({
    type: "PlutusV2",
    script: giftCard,
  });// biến policyId của giftcard sau 1 lần sử dụng
 
  const redeem = applyParamsToScript(validators.redeem.script, [
    fromText(tokenName),
    policyId,
  ]);// biến mô tả redeem đốt tài sản bao gồm có mô tả hợp đồng, tên tài sản, policyId
 
  const lockAddress = lucid.utils.validatorToAddress({
    type: "PlutusV2",
    script: redeem,
  });// biến lưu lại mô tả của hợp đồng thông minh
 
  return {
    redeem: { type: "PlutusV2", script: applyDoubleCborEncoding(redeem) },
    giftCard: { type: "PlutusV2", script: applyDoubleCborEncoding(giftCard) },
    policyId,
    lockAddress,
  };
}