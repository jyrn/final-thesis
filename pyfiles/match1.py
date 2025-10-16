

# matching_score_formatted.py
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Example job data
jobs = [
    {
        "id": 1,
        "jobTitle": "Frontend Developer",
        "company": "Tech Solutions Inc.",
        "requiredSkills": ["React", "SQL", "Typescript"]
    },
    {
        "id": 2,
        "jobTitle": "Backend Developer",
        "company": "CodeWorks Ltd.",
        "requiredSkills": ["Node.js", "Express", "MongoDB"]
    },
    {
        "id": 3,
        "jobTitle": "Data Analyst",
        "company": "Data Insights",
        "requiredSkills": ["Python", "SQL", "Machine Learning"]
    },
]

# Fixed resume skills (same for all jobs)
resume_skills = ["Python", "SQL", "Node.js", "Database"]

def compute_match_score(required_skills, resume_skills):
    """
    Computes the match score between required skills and resume skills using TF-IDF cosine similarity.
    Returns the score as a percentage rounded to 2 decimal places.
    """
    required_text = " ".join(required_skills)
    resume_text = " ".join(resume_skills)
    
    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform([required_text, resume_text])
    
    similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
    return round(similarity * 100, 2)

# Compute match scores
for job in jobs:
    job['matchScore'] = compute_match_score(job['requiredSkills'], resume_skills)

# Sort jobs in descending order (highest match first)
jobs_sorted = sorted(jobs, key=lambda x: x['matchScore'], reverse=True)

# Display results
for idx, job in enumerate(jobs_sorted, start=1):
    print(f"Job No: {idx}")
    print(f"Company Name: {job['company']}")
    print(f"Req Skills: {', '.join(job['requiredSkills'])}")
    print(f"Your Skills: {', '.join(resume_skills)}")  # Fixed for all jobs
    print(f"Match Score: {job['matchScore']}%")
    print("-" * 50)
