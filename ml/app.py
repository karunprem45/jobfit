"""
Semantic skill matching service.

The Node backend does exact matching: it looks for the literal string "Docker"
in the job description. That is precise but brittle — a JD saying
"containerization experience" never matches the skill "Docker", even though a
human reads them as the same thing.

This service adds the recall half. It scores every skill against every sentence
of the JD using TF-IDF cosine similarity, and reports the ones that are related
without being literal.

Exact matching stays the source of truth. This is advisory only, which is why
the backend treats a failure here as non-fatal.
"""

from fastapi import FastAPI
from pydantic import BaseModel
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import re

app = FastAPI(title="JobFit semantic matcher")

# Below this cosine similarity we treat a pairing as noise rather than a signal.
#
# Chosen from measured scores, not guessed. On a JD mentioning containers, CI,
# tests and UIs, the skills that genuinely belonged scored 0.051-0.163 while the
# ones that did not (Machine Learning, PostgreSQL, Agile) scored exactly 0.000 —
# they share no vocabulary at all with the text. The gap between those two
# groups is wide, so anything above 0.03 is signal.
#
# Absolute values look low because the vectors include bigrams, which spread
# each document's norm over many terms. What matters is the separation.
SIMILARITY_THRESHOLD = 0.03

# Domain knowledge the raw text does not carry. TF-IDF can tell that two
# sentences share words; it cannot know that k8s means Kubernetes.
SKILL_CONTEXT = {
    "Docker": "container containerization image build packaging runtime",
    "Kubernetes": "k8s orchestration cluster pods deployment scaling",
    "CI/CD": "continuous integration delivery pipeline automation build deploy",
    "React": "frontend user interface ui component framework spa",
    "Node.js": "backend server javascript runtime api service",
    "REST APIs": "api endpoint http web service integration",
    "PostgreSQL": "relational database sql rdbms postgres",
    "NoSQL": "document store nosql mongodb firebase non-relational",
    "Machine Learning": "ml ai artificial intelligence model training genai llm",
    "Agile": "scrum sprint ceremony standup iterative agile methodology",
    "Testing": "unit test qa quality assurance verification debugging",
    "Data Structures": "algorithm complexity optimization efficiency data structure",
    "Algorithms": "algorithm complexity big-o optimization problem solving",
    "Cloud": "cloud computing aws azure gcp ibm cloud hosting infrastructure",
    "Git": "version control repository branch merge collaboration",
}


class Skill(BaseModel):
    name: str
    category: str = ""
    aliases: list[str] = []


class MatchRequest(BaseModel):
    jd_text: str
    skills: list[Skill]


def split_sentences(text: str) -> list[str]:
    """Cheap sentence split — good enough for job descriptions."""
    parts = re.split(r"[.!?\n•]+", text)
    return [p.strip() for p in parts if len(p.strip()) > 15]


def skill_document(skill: Skill) -> str:
    """Expand a skill into a bag of words: name + aliases + domain context."""
    pieces = [skill.name, *skill.aliases, SKILL_CONTEXT.get(skill.name, "")]
    return " ".join(pieces).lower()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/semantic-match")
def semantic_match(req: MatchRequest):
    sentences = split_sentences(req.jd_text)

    if not sentences or not req.skills:
        return {"related": [], "sentences_analyzed": len(sentences)}

    skill_docs = [skill_document(s) for s in req.skills]

    # Fit one vectorizer over both corpora so they share a vocabulary.
    vectorizer = TfidfVectorizer(
        stop_words="english",
        ngram_range=(1, 2),
        sublinear_tf=True,
    )
    matrix = vectorizer.fit_transform(skill_docs + sentences)

    skill_vectors = matrix[: len(skill_docs)]
    sentence_vectors = matrix[len(skill_docs) :]

    similarity = cosine_similarity(skill_vectors, sentence_vectors)

    related = []
    for i, skill in enumerate(req.skills):
        best = similarity[i].argmax()
        score = float(similarity[i][best])

        if score >= SIMILARITY_THRESHOLD:
            related.append(
                {
                    "name": skill.name,
                    "category": skill.category,
                    "similarity": round(score, 3),
                    "evidence": sentences[best][:160],
                }
            )

    related.sort(key=lambda r: r["similarity"], reverse=True)
    return {"related": related, "sentences_analyzed": len(sentences)}
