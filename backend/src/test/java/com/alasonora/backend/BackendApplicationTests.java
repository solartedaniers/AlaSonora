package com.alasonora.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

// Este test arranca contra la base configurada en .env: con ddl-auto=none nunca altera su esquema.
@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=none")
class BackendApplicationTests {

	@Test
	void contextLoads() {
	}

}
