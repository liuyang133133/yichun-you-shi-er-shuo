#!/bin/sh
for m in docker.m.daocloud.io docker.1ms.run dockerproxy.cn hub.rat.dev registry.cn-hangzhou.aliyuncs.com mirror.baidubce.com docker.mirrors.ustc.edu.cn; do
  printf "%-45s" "$m"
  wget -q -T 6 -O /dev/null --tries=1 "https://${m}/v2/" 2>&1
  echo "  exit=$?"
done
