/**
 * Next.js API Route - 健康检查
 * GET /api/health
 */
export async function GET() {
  return Response.json({
    code: 0,
    message: 'ok',
    data: {
      service: 'yichun-frontend',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  });
}
