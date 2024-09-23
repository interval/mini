import { createIntervalApp, io } from "@interval/mini";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

createIntervalApp({
  port: 3001,
  publicFrontendProxyUrl: "http://localhost:3000",
  actions: {
    hello_world: {
      handler: async () => {
        console.log("Hello world called");
        // await sleep(2000);
        const firstName = await io("INPUT_TEXT", {
          label: "What is your first name?",
        });

        await sleep(1000);

        const lastName = await io("INPUT_TEXT", {
          label: "What is your last name?",
        });

        console.log(`Hello ${firstName} ${lastName}`);
      },
    },
  },
});

console.log(`Interval Mini Demo`);
