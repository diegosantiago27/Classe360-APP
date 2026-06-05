# Stage 1: build do JAR
FROM eclipse-temurin:17-jdk-alpine AS build

WORKDIR /app

COPY mvnw mvnw.cmd ./
COPY .mvn .mvn
COPY pom.xml sonar-project.properties checkstyle.xml ./
RUN chmod +x mvnw

COPY src src

RUN ./mvnw -ntp -B -DskipTests -Dmodernizer.skip=true package

# Stage 2: runtime
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

COPY --from=build /app/target/classe-360-*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
