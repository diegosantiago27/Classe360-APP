package com.classe360.config;

import com.classe360.domain.Usuario;
import com.classe360.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Garante usuários de demonstração no ambiente local (perfil dev).
 * Idempotente: só insere CPFs que ainda não existem no banco.
 */
@Component
@Profile("dev")
public class DevUsuarioSeeder implements ApplicationRunner {

    private static final Logger LOG = LoggerFactory.getLogger(DevUsuarioSeeder.class);
    private static final String DEFAULT_PASSWORD = "admin@Classe360";

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public DevUsuarioSeeder(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        int created = 0;
        for (SeedUser seed : SEED_USERS) {
            if (usuarioRepository.findByCpf(seed.cpf).isPresent()) {
                continue;
            }
            Usuario usuario = Usuario.builder()
                .cpf(seed.cpf)
                .nome(seed.nome)
                .email(seed.email)
                .senha(passwordEncoder.encode(DEFAULT_PASSWORD))
                .role(seed.role)
                .ativo(seed.ativo)
                .build();
            usuarioRepository.save(usuario);
            created++;
        }
        if (created > 0) {
            LOG.info("DevUsuarioSeeder: {} usuário(s) de demonstração criado(s). Senha padrão: {}", created, DEFAULT_PASSWORD);
        }
    }

    private record SeedUser(String cpf, String nome, String email, Usuario.Role role, boolean ativo) {}

    private static final SeedUser[] SEED_USERS = {
        new SeedUser("11111111111", "Administrador", "admin@classe360.com", Usuario.Role.ROLE_ADMIN, true),
        new SeedUser("22222222222", "João Santos", "joao@escola.com", Usuario.Role.ROLE_ADMIN, true),
        new SeedUser("33333333333", "Ana Costa", "ana@escola.com", Usuario.Role.ROLE_PROFESSOR, true),
        new SeedUser("44444444444", "Pedro Oliveira", "pedro@escola.com", Usuario.Role.ROLE_ALUNO, true),
        new SeedUser("55555555555", "Carlos Mendes", "carlos@escola.com", Usuario.Role.ROLE_PROFESSOR, false),
        new SeedUser("66666666666", "Lucia Ferreira", "lucia@escola.com", Usuario.Role.ROLE_ALUNO, true),
        new SeedUser("77777777777", "Roberto Lima", "roberto@escola.com", Usuario.Role.ROLE_ALUNO, true),
        new SeedUser("88888888888", "Fernanda Souza", "fernanda@escola.com", Usuario.Role.ROLE_PROFESSOR, true),
        new SeedUser("99999999999", "Maria Silva", "maria@escola.com", Usuario.Role.ROLE_GESTOR, true),
    };
}
