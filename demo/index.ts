import * as interval from "@interval/mini";

interval.createIntervalApp({
  port: 3001,
  publicFrontendProxyUrl: "http://localhost:3000",
});

console.log(`Interval Mini Demo`);
