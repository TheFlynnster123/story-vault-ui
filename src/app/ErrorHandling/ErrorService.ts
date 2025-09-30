import { notifications } from "@mantine/notifications";

export interface ErrorNotificationOptions {
  message: string;
  title?: string;
  autoClose?: number | false;
}
export interface IErrorService {
  log: (message: string, error?: any) => void;
}

export class ErrorService implements IErrorService {
  log = (message: string, error?: any) => {
    console.error(message, error);
    notifications.show({
      message: message,
      color: "red",
      autoClose: 5000,
      withCloseButton: true,
    });
  };
}
