export {};

declare global {
  interface Window {
    puter: {
      ai: {
        chat: (message: string | any[], options?: any) => Promise<any>;
      };
    };
  }
  const puter: {
    ai: {
      chat: (message: string | any[], options?: any) => Promise<any>;
    };
  };
}
