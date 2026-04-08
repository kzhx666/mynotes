FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm install

# 拷贝所有代码
COPY . .

# 【终极修复点】：在 Next.js 开始 build 之前，由 Docker 在系统底层强行创建好数据库和图床文件夹
RUN mkdir -p data public/uploads

# 开始打包
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
