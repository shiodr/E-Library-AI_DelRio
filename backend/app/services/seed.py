"""Idempotently seed metadata only. Never download or redistribute source files."""

from sqlalchemy.dialects.postgresql import insert

from app.core.database import SessionLocal
from app.models import Book

SAMPLES = [
    (
        "Pride and Prejudice",
        "Jane Austen",
        "Literature",
        "1813",
        "1342",
        ("A perceptive comedy of manners about first impressions, family expectations, and the relationship "
        "between Elizabeth Bennet and Mr. Darcy in nineteenth-century England."),
    ),
    (
        "Frankenstein",
        "Mary Wollstonecraft Shelley",
        "Literature",
        "1818",
        "84",
        ("Victor Frankenstein creates a living being and confronts the consequences of abandoning his creation. "
        "A classic exploration of ambition, responsibility, and belonging."),
    ),
    (
        "Alice's Adventures in Wonderland",
        "Lewis Carroll",
        "Adventure",
        "1865",
        "11",
        ("Alice follows a white rabbit into a world where logic bends and curiosity leads the way. "
        "A playful adventure full of wordplay and unexpected encounters."),
    ),
    (
        "The Time Machine",
        "H. G. Wells",
        "Science fiction",
        "1895",
        "35",
        ("An inventor travels far into the future and encounters a civilization divided in unsettling ways. "
        "An early science fiction story about progress, society, and time."),
    ),
    (
        "On the Origin of Species",
        "Charles Darwin",
        "Science",
        "1859",
        "1228",
        ("Darwin presents evidence for evolution through natural selection, drawing on observations of "
        "variation, adaptation, and the relationships among living organisms. A historical scientific text."),
    ),
    (
        "A Journey to the Centre of the Earth",
        "Jules Verne",
        "Adventure",
        "1871 English rewrite",
        "18857",
        ("A professor and his companions follow a cryptic manuscript into the depths of the Earth. "
        "An imaginative nineteenth-century scientific adventure in an early English rewrite."),
    ),
    (
        "The War of the Worlds",
        "H. G. Wells",
        "Science fiction",
        "1898",
        "36",
        ("An invasion from Mars turns familiar English landscapes into a struggle for survival. "
        "Wells examines human vulnerability and the assumptions of technological power."),
    ),
    (
        "The Secret Garden",
        "Frances Hodgson Burnett",
        "Literature",
        "1911",
        "17396",
        ("A lonely child discovers a locked garden on the Yorkshire moors. "
        "A story of friendship, renewal, and the restorative possibilities of nature."),
    ),
]


def seed():
    with SessionLocal() as db:
        for title, author, category, publication, source_id, description in SAMPLES:
            db.execute(
                insert(Book)
                .values(
                    title=title,
                    author=author,
                    category=category,
                    description=description,
                    cover_url=None,
                    source_url=f"https://www.gutenberg.org/ebooks/{source_id}",
                    license_type=f"Public domain in the USA ({publication}); verify local laws and Project Gutenberg terms.",
                )
                .on_conflict_do_nothing()
            )
        db.commit()
    print(f"Seed complete: {len(SAMPLES)} sample records checked (no book files downloaded).")


if __name__ == "__main__":
    seed()
