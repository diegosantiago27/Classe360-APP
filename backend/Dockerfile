# Dockerfile para aplicação Classe360
FROM eclipse-temurin:21-jdk-alpine

# Diretório de trabalho
WORKDIR /app

# Copiar o arquivo JAR para o container
COPY target/classe360-backend.jar app.jar

# Expor a porta da aplicação
EXPOSE 8080

# Comando para executar a aplicação
ENTRYPOINT ["java", "-jar", "app.jar"]