FROM eclipse-temurin:17-jdk-alpine AS builder
WORKDIR /workspace

RUN apk add --no-cache maven

COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn clean package -DskipTests -B

FROM eclipse-temurin:17-jre-alpine AS runner
WORKDIR /app

RUN addgroup -S stepstyle && adduser -S stepstyle -G stepstyle
USER stepstyle:stepstyle

COPY --from=builder /workspace/target/*.jar app.jar

EXPOSE 8080

ENV JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseG1GC"

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/v3/api-docs || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
