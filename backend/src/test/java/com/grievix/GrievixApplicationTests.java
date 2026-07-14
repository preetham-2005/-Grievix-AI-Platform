package com.grievix;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("dev")
class GrievixApplicationTests {

    @Test
    void contextLoads() {
        // Sanity test to ensure context boots up fine with H2 and local mock setups
    }
}
