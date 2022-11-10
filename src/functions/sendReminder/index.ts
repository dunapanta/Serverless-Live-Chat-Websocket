import { DynamoDBStreamEvent } from "aws-lambda";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { AttributeValue } from "@aws-sdk/client-dynamodb";
import {
  SESClient,
  SendEmailCommand,
  SendEmailCommandInput,
} from "@aws-sdk/client-ses";
import {
  SNSClient,
  PublishCommand,
  PublishCommandInput,
} from "@aws-sdk/client-sns";

const sesClient = new SESClient({});
const snsClient = new SNSClient({});

export const handler = async (event: DynamoDBStreamEvent) => {
  try {
    const reminderPromises = event.Records.map(async (record) => {
      const data = unmarshall(
        record.dynamodb.OldImage as Record<string, AttributeValue>
      );

      const { email, phoneNumber, reminder } = data;
      if (phoneNumber) {
        //send sms
        await sendSMS({ phoneNumber, reminder });
      }
      if (email) {
        //send email
        await sendEmail({ email, reminder });
      }
    });

    await Promise.all(reminderPromises);
  } catch (err) {}
};

const sendEmail = async ({
  email,
  reminder,
}: {
  email: string;
  reminder: string;
}) => {
  const params: SendEmailCommandInput = {
    Source: "daniel.unapanta@tekbees.com",
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Body: {
        Text: {
          Charset: "UTF-8",
          Data: reminder,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: "Reminder!!",
      },
    },
  };
  const command = new SendEmailCommand(params);

  const res = await sesClient.send(command);

  return res.MessageId;
};

const sendSMS = async ({
  phoneNumber,
  reminder,
}: {
  phoneNumber: string;
  reminder: string;
}) => {
  const params: PublishCommandInput = {
    Message: reminder,
    PhoneNumber: phoneNumber,
  };
  const command = new PublishCommand(params);

  const res = await snsClient.send(command);

  return res.MessageId;
};
