import type { AWS } from "@serverless/typescript";

const functions: AWS["functions"] = {
  setReminder: {
    handler: "src/functions/setReminder/index.handler",
    events: [
      {
        httpApi: {
          method: "post",
          path: "/",
        },
      },
    ],
  },
  sendReminder: {
    handler: "src/functions/sendReminder/index.handler",
    events: [
      {
        stream: {
          type: "dynamodb",
          arn: {
            "Fn::GetAtt": ["roomConnectionTable", "StreamArn"],
          },
          filterPatterns: [
            {
              eventName: ["REMOVE"],
            },
          ],
        },
      },
    ],
    //@ts-expect-error
    iamRoleStatements: [
      {
        Effect: "Allow",
        Action: ["ses:SendEmail", "sns:Publish"],
        Resource: "*",
      },
    ],
  },
  getReminders: {
    handler: "src/functions/getReminders/index.handler",
    events: [
      {
        httpApi: {
          method: "get",
          path: "/{userId}",
        },
      },
    ],
  },
};

export default functions;
