import { Lucid } from "https://deno.land/x/lucid@0.8.3/mod.ts";
const lucid = await Lucid.new(undefined, "Preview");
const beneficiaryPriavateKey=lucid.utils.generatePrivateKey();
await Deno.writeTextFile("beneficiary.sk",beneficiaryPriavateKey)
const beneficiaryAddress=await lucid.selectWalletFromPrivateKey(beneficiaryPriavateKey)
.wallet.address();
await Deno.writeTextFile("beneficiary.addr",beneficiaryAddress);
//deno run --allow-net --allow-write generate-beneficiary.ts