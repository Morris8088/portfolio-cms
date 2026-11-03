---
title: 手写一个 JWT：鉴权其实没那么神秘
slug: handwrite-jwt
tags: Node,鉴权,安全
status: published
date: 2026-10-24T09:05:00.000Z
views: 143
summary: 不用 jsonwebtoken，不用 bcrypt，只用 Node 内置的 crypto 模块，30 行代码实现"签发通行证 + 验证通行证"。
---

第一次看到 JWT 那一长串 `eyJhbGciOi...` 的时候，我以为是什么黑魔法。

拆开看，它就是**三段 Base64 + 一次签名**。

## 一、结构

```
header.payload.signature
```

- **header**：说明用什么算法签名
- **payload**：你想让服务器记住的信息（用户 id、过期时间）
- **signature**：用密钥对前两段做 HMAC 计算

关键在于：payload 是**明文可读**的（Base64 只是编码，不是加密）。所以千万别往里塞密码、手机号。

## 二、签名怎么算

```js
const signature = createHmac('sha256', SECRET)
  .update(`${header}.${body}`)
  .digest('base64url');
```

服务器验证时，用同样的密钥再算一遍，和用户带来的签名比对。**只要 payload 被改过一个字符，签名就对不上。**

这就是"防篡改"的全部原理。

## 三、密码为什么不能明文存

数据库泄露的新闻年年有。如果存明文，等于把所有人的密码送出去——而且很多人多个平台用同一个密码。

正确做法是存**哈希**：

```js
const salt = randomBytes(16).toString('hex');
const hash = scryptSync(password, salt, 64).toString('hex');
```

- **salt（盐）**：每个用户随机不同。这样即使两个用户密码一样，哈希结果也不同，彩虹表直接失效。
- **scrypt**：故意设计得很慢的算法。正常登录慢 50ms 无所谓，暴力破解要慢几万年。

## 四、两个容易忽略的细节

1. **比较要用 timingSafeEqual**
   普通 `===` 会在第一个不同字符处返回，攻击者可以通过响应时间差猜出正确前缀。

2. **登录失败提示要模糊**
   "账号不存在"和"密码错误"要返回同一句话，否则等于告诉攻击者这个账号是有效的。

## 五、前端怎么存令牌

我用的是 `localStorage`，简单但要注意 XSS 风险。更安全的方案是 httpOnly Cookie，代价是跨域配置更麻烦。

**没有绝对安全，只有权衡。** 能说清楚自己为什么这么选，比背结论重要。
