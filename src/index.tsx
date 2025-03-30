import { Context, h, Schema, Session } from 'koishi'
import sharp from 'sharp'

export const name = 'febfrost-daily-anime'

export interface Config { }

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context) {
  ctx.command('日报')
    .action(async ({ session }) => {
      try {
        const startTime = Date.now()

        // 使用axios实例获取完整响应
        const axiosResponse = await ctx.http('http://127.0.0.1:10001/anime', {
          method: 'GET',
          responseType: 'arraybuffer',
          timeout: 15000
        })

        // 正确获取响应头
        console.log(axiosResponse.headers, axiosResponse.headers.get('content-type'))
        const contentType = axiosResponse.headers.get('content-type')
        if (contentType?.includes('image/jpeg')) {
          const buffer = await sharp(axiosResponse.data).jpeg().toBuffer()
          // await session.send(`今日动漫日报（${Date.now() - startTime}ms）`)
          return session.send(h.image(buffer, 'image/jpeg'))
        }

        // 处理非图片响应
        const decoder = new TextDecoder('utf-8')
        const errorMessage = decoder.decode(axiosResponse.data)
        return `服务返回错误：${errorMessage}`
      } catch (error) {
        // 修正错误处理
        if (error.response) {
          const status = error.response.status
          if (status === 503) return '今日重试次数已用尽，请明天再试'
          if (status === 429) return '请求过于频繁，请稍后重试'

          // 处理带错误信息的响应体
          if (error.response.data) {
            const decoder = new TextDecoder('utf-8')
            const message = decoder.decode(error.response.data)
            return `服务错误 (${status}): ${message}`
          }
          return `服务错误 (${status})`
        }

        // 处理网络层错误
        if (error.code) {
          switch (error.code) {
            case 'ECONNREFUSED':
              return '服务未启动，请 @二月霜 检查本地服务'
            case 'ETIMEDOUT':
              return '请求超时，请检查网络连接'
            default:
              return `网络错误 (${error.code})`
          }
        }

        console.error('动漫日报插件异常:', error)
        return '获取日报失败，请稍后再试'
      }
    })
}
