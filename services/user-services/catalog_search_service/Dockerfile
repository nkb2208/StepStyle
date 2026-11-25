# Build stage
FROM eclipse-temurin:17-jdk-alpine AS builder
WORKDIR /workspace

# Install maven
RUN apk add --no-cache maven

# Cache dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build executable jar (skipping tests for fast container packaging)
COPY src ./src
RUN mvn clean package -DskipTests -B

# Production run stage
FROM eclipse-temurin:17-jre-alpine AS runner
WORKDIR /app

# Add unprivileged user for security
RUN addgroup -S stepstyle && adduser -S stepstyle -G stepstyle
USER stepstyle:stepstyle

# Copy fat jar from builder stage
COPY --from=builder /workspace/target/*.jar app.jar

# Container network port
EXPOSE 8080

# Environment defaults
ENV JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseG1GC"

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/v3/api-docs || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
