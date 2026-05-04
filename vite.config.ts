import { defineConfig } from 'vite-plus'

export default defineConfig({
  run: {
    tasks: {
      'db:migrate': {
        command: 'node server/db/migrate-cli.ts',
      },
      'db:seed': {
        command: 'node server/db/seed.ts',
      },
      'tmdb:refresh-seed': {
        command: 'node server/media/refresh-seed.ts',
      },
    },
  },
})
