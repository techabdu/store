/**
 * Simple bridge to allow non-React files to trigger notifications
 */

let notifyHandler = null;

export const registerNotifyHandler = (handler) => {
    notifyHandler = handler;
};

export const notify = (type, message) => {
    if (notifyHandler) {
        notifyHandler(type, message);
    } else {
        console.warn('Notification handler not registered. Message:', message);
    }
};

export const notifyError = (msg) => notify('error', msg);
export const notifySuccess = (msg) => notify('success', msg);
export const notifyInfo = (msg) => notify('info', msg);
export const notifyWarning = (msg) => notify('warning', msg);
