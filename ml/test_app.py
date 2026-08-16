"""Unit tests for the semantic matcher."""
from app import split_sentences, skill_document, semantic_match, MatchRequest, Skill


def test_split_sentences_drops_fragments():
    text = "We use Docker daily. Ok. Kubernetes runs our production cluster."
    sentences = split_sentences(text)
    assert len(sentences) == 2
    assert "Ok" not in sentences


def test_skill_document_includes_aliases_and_context():
    doc = skill_document(Skill(name="Kubernetes", aliases=["k8s"]))
    assert "k8s" in doc
    assert "orchestration" in doc


def test_semantic_match_finds_non_literal_mention():
    """'containerization' never says Docker, but should still surface it."""
    req = MatchRequest(
        jd_text="Experience with containerization and image build tooling is required.",
        skills=[Skill(name="Docker", category="devops")],
    )
    result = semantic_match(req)
    assert len(result["related"]) == 1
    assert result["related"][0]["name"] == "Docker"
    assert result["related"][0]["similarity"] > 0


def test_semantic_match_handles_empty_input():
    req = MatchRequest(jd_text="", skills=[])
    assert semantic_match(req)["related"] == []


def test_threshold_separates_signal_from_noise():
    """
    The threshold is only defensible if related and unrelated skills land on
    opposite sides of it. Unrelated skills share no vocabulary with the text,
    so they score 0.0 exactly.
    """
    req = MatchRequest(
        jd_text=(
            "Experience with containerization and orchestration of workloads. "
            "Our team runs continuous integration pipelines with automated deployment."
        ),
        skills=[
            Skill(name="Docker"),
            Skill(name="CI/CD"),
            Skill(name="Machine Learning"),
            Skill(name="Agile"),
        ],
    )
    found = {r["name"] for r in semantic_match(req)["related"]}

    assert "Docker" in found          # implied by "containerization"
    assert "CI/CD" in found           # implied by "continuous integration"
    assert "Machine Learning" not in found
    assert "Agile" not in found
