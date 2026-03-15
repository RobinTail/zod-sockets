export const waitFor = async (cb: () => boolean) =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      clearInterval(timer);
      reject();
    }, 10000);
    const timer = setInterval(() => {
      if (cb()) {
        clearInterval(timer);
        clearTimeout(timeout);
        resolve("OK");
      }
    }, 100);
  });
