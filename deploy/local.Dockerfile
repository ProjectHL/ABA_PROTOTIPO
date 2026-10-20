FROM node:22.23.2-bookworm-slim
WORKDIR /workspace
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]
