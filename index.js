const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const keep_alive = require('./keep_alive.js');

const token = '7292586219:AAEerbRNkRS6atNxLebo_9Ngc_qgFiR99pA';
const bot = new TelegramBot(token, { polling: true });
const chatId = '6573357046';
let  dataPhone = [];


async function sendTelegramMessage(message) {
    try {
        await bot.sendMessage(chatId, message);
    } catch (error) {
        console.error("Lỗi gửi tin nhắn đến Telegram:", error);
    }
}

async function login(userName, reties = 4) {
    let password = "";
    if (reties < 0) {
        return;
    }
    if (reties === 4) {
        password = "111111";
    }
    if (reties === 3) {
        password = "666777";
    }
    if (reties === 2) {
        password = "999999";
    }
    if (reties === 1) {
        password = "888888";
    }
    const data = {
        userName: userName,
        password: password
    };
    const headers = {
        "user-agent": "Dart/2.18 (dart:io)",
        "Content-Type": "application/json",
        "accept-encoding": 'gzip',
        "content-length": "45",
        "host": "backend2.tgss.vn"
    };
    const response = await axios.post('https://backend2.tgss.vn/0e96d6b13fb5335193eee7ed50eb5aa0/customers/login', data, {headers: headers});
    const status = response.data.success;
    if (status) {
        const token = response.data.data.token;
        return token;
    }
    return await login(userName, reties - 1)

}

async function exchanges(token) {
    const url = "https://backend2.tgss.vn/2e55ad4eb9ad4631b65efe18710b6feb/posts/exchanges?Status=1&PageIndex=1&PageSize=1000000";
    const headers = {
        "sec-ch-ua": '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "sec-ch-ua-mobile": "?0",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "sec-ch-ua-platform": '"Windows"',
        "Sec-Fetch-Site": "cross-site",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Dest": "empty",
        "host": "backend2.tgss.vn",
        "Authorization": `Bearer ${token}`,
    }
    const response = axios.get(url, {headers: headers});
    return (await response).data.data
}

async function exportGift() {
    const usedPhones = [];
    const unusedPhones = [];
    let usedCouponCount = 0;
    let hasGiftPostCount = 0;

    for (const phone of dataPhone) {
        const userName = `0${phone}`;
        const token = await login(userName);
        if (token) {
            const dataGift = await exchanges(token);
            if (dataGift) {
                const dataGifts = dataGift.items;
                let found = false;
                for (const gifts of dataGifts) {
                    for (const gift of gifts) {
                        if (gift.referral.id === '08dcb51a-6d9e-407c-8dfe-fc37a5319ae3') {
                            const message = `${phone}: ${gift.referral.title}`;
                            found = true;
                            usedPhones.push(phone);
                            hasGiftPostCount++;
                            console.log(message)
                            break;
                        }
                    }
                    if (found) break;
                }
                if (!found) {
                    unusedPhones.push(phone);
                    const message = `${phone}: Đã dùng coupon`;
                    usedCouponCount++;
                    console.log(message)
                }
            } else {
                unusedPhones.push(phone);
                const message = `${phone}: Đã dùng coupon`;
                usedCouponCount++;
                console.log(message)
            }
        } else {
            unusedPhones.push(phone);
            const message = `${phone}: Đã dùng coupon`;
            usedCouponCount++;
            console.log(message)
        }
    }

    const summaryMessage = `Tổng đã dùng : ${usedCouponCount} : ${unusedPhones.join(', ')}\n` +
        `Tổng chưa dùng ': ${hasGiftPostCount} : ${usedPhones.join(', ')}`
    const status=`Yêu mỡ yêu yêuuuuuuuu `
    await sendTelegramMessage(summaryMessage);
    await sendTelegramMessage(status);
    dataPhone = [];
}


bot.on('message', async (msg) => {
    const messageChatId = msg.chat.id;
    const text = msg.text;

    if (messageChatId.toString() === chatId) {
        if (text.startsWith('')) {
            const phones = text.split('\n').slice(0).map(phone => phone.trim());
            console.log(phones)
            const invalidPhones = [];

            phones.forEach(phone => {
                if (phone && !isNaN(phone)) {
                    const phoneNumber = Number(phone);
                    if (!dataPhone.includes(phoneNumber)) {
                        dataPhone.push(phoneNumber);
                    }
                } else {
                    invalidPhones.push(phone);
                }
            });
            console.log(invalidPhones)
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
            await sendTelegramMessage('Lệnh không hợp lệ. Sử dụng "PHONES" và gửi các số điện thoại (mỗi số trên một dòng) để thêm số điện thoại.');
        }
    }
});
