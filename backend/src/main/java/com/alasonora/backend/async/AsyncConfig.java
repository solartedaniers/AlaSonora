package com.alasonora.backend.async;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import com.alasonora.backend.config.AiProperties;

/**
 * Bulkhead: la clasificación con IA (descargar la grabación y llamar al motor Python)
 * corre en su propio pool acotado, aislado de los hilos HTTP de Tomcat. Así un motor
 * lento o colgado nunca deja sin hilos al resto de la aplicación.
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    private final AiProperties aiProperties;

    public AsyncConfig(AiProperties aiProperties) {
        this.aiProperties = aiProperties;
    }

    @Bean
    Executor aiTaskExecutor() {
        AiProperties.Executor config = aiProperties.executor();

        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(config.corePoolSize());
        executor.setMaxPoolSize(config.maxPoolSize());
        executor.setQueueCapacity(config.queueCapacity());
        executor.setThreadNamePrefix("ai-task-");
        // Contrapresión: con el pool y su cola llenos, ejecuto la tarea en el hilo que
        // la pidió en vez de rechazarla o hacer crecer el pool sin límite.
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }
}
