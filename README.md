# unit-test-agent

CLI agent that generates Go unit tests and improves project coverage.

## Run with Docker (cloud-friendly)

### Build image

```bash
docker build -t unit-test-agent .
```

### Run against a mounted repository

Mount any Go repository under `/workspace` and point `--src` to that path:

```bash
docker run --rm \
  -v /absolute/path/to/go-repo:/workspace/target-repo \
  -e OPENAI_API_KEY="$OPENAI_API_KEY" \
  unit-test-agent run \
  --src /workspace/target-repo \
  --coverage 80 \
  --model openai
```

### Inject environment variables

You can inject env at runtime using either:

- `-e KEY=value` for individual values
- `--env-file /path/to/.env` for many values

Example with env file:

```bash
docker run --rm \
  --env-file .env \
  -v /absolute/path/to/go-repo:/workspace/target-repo \
  unit-test-agent run \
  --src /workspace/target-repo \
  --coverage 80 \
  --model openai
```

## Relevant environment variables

- `SOURCE_FOLDER`: default source path if `--src` is omitted
- `TARGET_COVERAGE`: default target coverage if `--coverage` is omitted
- `TARGET_MODEL`: `openai` or `ollama` if `--model` is omitted
- `CONCURRENCY`: max concurrent plans/tests (default `2`)
- `GRAPH_RECURSION_LIMIT`: graph recursion limit (default `50`)
- `OPENAI_API_KEY`: required when using OpenAI provider
- `OPENAI_MODEL`: optional OpenAI model override
- `OLLAMA_MODEL`: optional Ollama model override

If using Ollama from inside a container, ensure the Ollama endpoint is reachable from the runtime environment (for example via host networking or a reachable service URL).