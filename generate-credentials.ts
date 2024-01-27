import { Lucid } from "https://deno.land/x/lucid@0.10.7/mod.ts";
 
const lucid = await Lucid.new(undefined, "Preview");
 
const privateKey = lucid.utils.generatePrivateKey();
await Deno.writeTextFile("me.sk", privateKey);
 
const address = await lucid
  .selectWalletFromPrivateKey(privateKey)
  .wallet.address();
await Deno.writeTextFile("me.addr", address);
//deno run --allow-net --allow-write generate-credentials.ts