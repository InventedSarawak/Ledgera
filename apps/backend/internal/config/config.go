package config

import (
	"os"
	"strings"

	"github.com/go-playground/validator/v10"
	_ "github.com/joho/godotenv/autoload"
	"github.com/knadh/koanf/providers/env"
	"github.com/knadh/koanf/v2"
	"github.com/rs/zerolog"
)

type Config struct {
	Primary       Primary              `koanf:"primary" validate:"required"`
	Server        ServerConfig         `koanf:"server" validate:"required"`
	Database      DatabaseConfig       `koanf:"database" validate:"required"`
	Redis         RedisConfig          `koanf:"redis" validate:"required"`
	Auth          AuthConfig           `koanf:"auth" validate:"required"`
	Integration   IntegrationConfig    `koanf:"integration" validate:"required"`
	Observability *ObservabilityConfig `koanf:"observability"`
	Blockhain     BlockchainConfig     `koanf:"blockchain" validate:"required"`
}

type Primary struct {
	Env string `koanf:"env" validate:"required"`
}

type ServerConfig struct {
	Port               string   `koanf:"port" validate:"required"`
	ReadTimeout        int      `koanf:"read_timeout" validate:"required"`
	WriteTimeout       int      `koanf:"write_timeout" validate:"required"`
	IdleTimeout        int      `koanf:"idle_timeout" validate:"required"`
	CORSAllowedOrigins []string `koanf:"cors_allowed_origins" validate:"required"`
}

type DatabaseConfig struct {
	Host            string `koanf:"host" validate:"required"`
	Port            int    `koanf:"port" validate:"required"`
	User            string `koanf:"user" validate:"required"`
	Password        string `koanf:"password"`
	Name            string `koanf:"name" validate:"required"`
	SSLMode         string `koanf:"ssl_mode" validate:"required"`
	MaxOpenConns    int    `koanf:"max_open_conns" validate:"required"`
	MaxIdleConns    int    `koanf:"max_idle_conns" validate:"required"`
	ConnMaxLifetime int    `koanf:"conn_max_lifetime" validate:"required"`
	ConnMaxIdleTime int    `koanf:"conn_max_idle_time" validate:"required"`
}

type BlockchainConfig struct {
	RpcUrl          string `koanf:"rpc_url" validate:"required,url"`
	ChainID         int    `koanf:"chain_id" validate:"required"`
	FactoryAddress  string `koanf:"factory_address" validate:"required"`
	CounterAddress  string `koanf:"counter_address" validate:"required"`
	AdminPrivateKey string `koanf:"admin_private_key" validate:"required"`
}

type RedisConfig struct {
	Address string `koanf:"address" validate:"required"`
}
type AuthConfig struct {
	SecretKey string `koanf:"secret_key" validate:"required"`
}

type IntegrationConfig struct {
	ResendAPIKey string `koanf:"resend_api_key" validate:"required"`
}

func LoadConfig() (*Config, error) {
	logger := zerolog.New(zerolog.ConsoleWriter{Out: os.Stderr}).With().Timestamp().Logger()
	k := koanf.New(".")

	err := k.Load(env.Provider("LEDGERA_", ".", func(s string) string {
		return strings.ToLower((strings.TrimPrefix(s, "LEDGERA_")))
	}), nil)
	if err != nil {
		logger.Fatal().Err(err).Msg("failed to load configuration from environment variables")
	}

	mainConfig := &Config{}

	if err := k.Unmarshal("", mainConfig); err != nil {
		logger.Fatal().Err(err).Msg("failed to unmarshal configuration into struct")
		return nil, err
	}

	validate := validator.New()
	if err = validate.Struct(mainConfig); err != nil {
		logger.Fatal().Err(err).Msg("configuration validation failed")
		return nil, err
	}

	if mainConfig.Observability == nil {
		mainConfig.Observability = DefaultObservabilityConfig()
	}

	mainConfig.Observability.ServiceName = "ledgera"
	mainConfig.Observability.Environment = mainConfig.Primary.Env

	if err := mainConfig.Observability.Validate(); err != nil {
		logger.Fatal().Err(err).Msg("invalid observability config")
	}

	return mainConfig, nil
}
