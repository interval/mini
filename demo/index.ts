import { createIntervalApp, io } from "@interval/mini";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

createIntervalApp({
  port: 3001,
  publicFrontendProxyUrl: "http://localhost:3000",
  actions: {
    hello_world: {
      handler: async () => {
        console.log("Hello world called");
        await sleep(2000);
        const yourName = await io("INPUT_TEXT", {
          label: "What is your name?",
        });
        console.log(`Hello ${yourName}`);
      },
    },
  },
});

console.log(`Interval Mini Demo`);
