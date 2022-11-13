import type { AWS } from "@serverless/typescript";

const functions: AWS["functions"] = {
  createRoom: {
    handler: "src/functions/createRoom/index.handler",
    events: [
      {
        websocket: {
          route: "createRoom", //route that will point to this lambda function
        },
      },
    ],
  },

  joinRoom: {
    handler: "src/functions/joinRoom/index.handler",
    events: [
      {
        websocket: {
          route: "joinRoom",
        },
      },
    ],
  },
};

export default functions;
