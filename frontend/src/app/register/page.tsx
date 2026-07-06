/**
 * /register — 复用 /login
 * 原因：登录页"短信登录"tab 已支持自动注册（未注册手机号首次登录即视为注册）
 * 这条路由的存在主要是为了 SEO / 外链 / 用户预期
 */
export { default } from '../login/page';
export const metadata = {
  title: '免费注册 - 伊春有事儿说',
  description: '伊春本地分类信息平台，手机号一键注册，免费发布房屋、二手、招聘、便民信息',
};
