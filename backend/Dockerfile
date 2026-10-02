# Etapa 1: compila el jar con el Maven Wrapper del proyecto (misma versión
# de Maven que en local) sobre JDK 21.
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

COPY .mvn .mvn
COPY mvnw pom.xml ./
# En git, mvnw no tiene permiso de ejecución (se versionó desde Windows).
RUN chmod +x mvnw

COPY src src
RUN ./mvnw clean package -DskipTests -B

# Etapa 2: solo el JRE 21, sin JDK ni Maven, para una imagen final liviana.
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/backend-*.jar app.jar

# server.port lee PORT (lo inyecta Render); 8083 es solo el valor local.
EXPOSE 8083
# La JVM, por defecto, solo usa el 25 % de la RAM del contenedor para el heap;
# en instancias chicas (512 MB) eso deja muy poco a Spring + Hibernate.
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
