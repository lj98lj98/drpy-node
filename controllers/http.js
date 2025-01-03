import axios from 'axios';
import http from 'http';
import https from 'https';

const AgentOption = {keepAlive: true, maxSockets: 64, timeout: 30000}; // 最大连接数64,30秒定期清理空闲连接
// const AgentOption = {keepAlive: true};
const httpAgent = new http.Agent(AgentOption);
const httpsAgent = new https.Agent({rejectUnauthorized: false, ...AgentOption});

// 配置 axios 使用代理
const _axios = axios.create({
    httpAgent,  // 用于 HTTP 请求的代理
    httpsAgent, // 用于 HTTPS 请求的代理
});

export default (fastify, options, done) => {
    // 读取 views 目录下的 encoder.html 文件并返回
    fastify.post('/http', async (req, reply) => {
        const {url, headers = {}, params = {}, method = 'GET', data = {}} = req.body;
        // console.log('headers:', headers);
        if (!url) {
            return reply.status(400).send({error: 'Missing required field: url'});
        }

        try {
            const response = await _axios({
                url,
                method,
                headers,
                params,
                data,
            });

            reply.status(response.status).send({
                status: response.status,
                headers: response.headers,
                data: response.data,
            });
        } catch (error) {
            // console.error(error);
            if (error.response) {
                // 服务器返回了非 2xx 状态码
                reply.status(error.response.status).send({
                    error: error.response.data,
                    status: error.response.status,
                });
            } else {
                // 请求失败或其他错误
                reply.status(500).send({error: error.message});
            }
        }
    });

    fastify.get('/ai', async (request, reply) => {
        const userInput = request.query.text;

        if (!userInput || userInput.trim() === '') {
            return reply.status(400).send({error: '请提供文本内容'});
        }

        const postFields = {
            messages: [
                {role: 'user', content: userInput}
            ],
            model: 'gpt-4o-mini-2024-07-18'
        };
        // console.log(JSON.stringify(postFields));
        try {
            const response = await _axios.post(
                'https://api.s01s.cn/API/ai_zdy/?type=2',
                postFields,
                {
                    headers: {'Content-Type': 'application/json'},
                    timeout: 30000,
                }
            );

            return reply.send(response.data);
        } catch (error) {
            fastify.log.error('Error:', error.message);
            return reply.status(500).send({error: '请求失败，请稍后重试'});
        }
    });

    done();
};
