import re
from typing import Dict, Tuple

# Domain taxonomies for CFA and FRM
COURSES = ["CFA L1", "CFA L2", "CFA L3", "FRM Part 1", "FRM Part 2", "General Prep"]

TOPICS = [
    "Fixed Income",
    "Quantitative Methods",
    "Financial Statement Analysis",
    "Equity Investments",
    "Corporate Issuers",
    "Derivatives",
    "Alternative Investments",
    "Portfolio Management",
    "Ethical & Professional Standards",
    "Economics",
    "Market Risk",
    "Credit Risk",
    "Operational Risk",
    "Liquidity & Treasury Risk",
    "Risk Management Principles",
    "General / Strategy"
]

FORMATS = [
    "Core Lecture",
    "Discussion / Podcast",
    "Doubt-clearing / Q&A",
    "Revision / Marathon",
    "Strategy / General"
]

def categorize_video(title: str, description: str = "") -> Dict[str, str]:
    """
    Classifies a video into Course, Topic, and Format using title-first domain pattern matching.
    Avoids false positives from boilerplate channel descriptions.
    """
    t = title.lower()

    # -------------------------------------------------------------
    # 1. Course Classification
    # -------------------------------------------------------------
    course = "General Prep"

    # Joint Part I & Part II syllabus/reviews
    is_joint_parts = bool(
        re.search(r"\b(frm\s*part\s*(?:i|1)\s*(?:and|&|/|\|)?\s*(?:frm\s*)?part\s*(?:ii|2)|part\s*(?:i|1)\s*(?:and|&|\|)\s*part\s*(?:ii|2)|part\s*(?:i|1)\s+part\s*(?:ii|2))\b", t)
    )

    if is_joint_parts:
        course = "General Prep"
    # Joint CFA & FRM mentions
    elif "cfa" in t and "frm" in t:
        if re.search(r"\b(frm\s*(?:part|p|pt|level)?\s*(?:1|i)\b|frm\s*p-?1\b|f1\s*book|f1book)\b", t) and not re.search(r"\b(cfa\s*(?:level|l|lvl)?\s*(?:1|2|i|ii)\b)", t):
            course = "FRM Part 1"
        elif re.search(r"\b(frm\s*(?:part|p|pt|level)?\s*(?:2|ii)\b|frm\s*p-?2\b)\b", t) and not re.search(r"\b(cfa\s*(?:level|l|lvl)?\s*(?:1|2|i|ii)\b)", t):
            course = "FRM Part 2"
        elif re.search(r"\b(cfa\s*(?:level|l|lvl)?\s*(?:1|i)\b|cfa\s*l-?1\b)", t) and not re.search(r"\b(frm\s*(?:part|p|pt|level)?\s*(?:1|2|i|ii)\b)", t):
            course = "CFA L1"
        elif re.search(r"\b(cfa\s*(?:level|l|lvl)?\s*(?:2|ii)\b|cfa\s*l-?2\b)", t) and not re.search(r"\b(frm\s*(?:part|p|pt|level)?\s*(?:1|2|i|ii)\b)", t):
            course = "CFA L2"
        else:
            course = "General Prep"
    # FRM Part 2
    elif re.search(r"\b(frm\s*(?:part|p|pt|level)?\s*(?:2|ii)|frm\s*p-?2|p2b1_)\b", t):
        course = "FRM Part 2"
    # FRM Part 1
    elif re.search(r"\b(frm\s*(?:part|p|pt|level)?\s*(?:1|i)|frm\s*p-?1|f1\s*book|f1book)\b", t) or \
         ("part i\b" in t and "frm" in t) or ("part 1\b" in t and "frm" in t) or \
         ("fmp" in t and "frm" in t) or ("vrm" in t and "frm" in t):
        course = "FRM Part 1"
    # CFA Level 2
    elif re.search(r"\b(cfa\s*(?:level|l|lvl)?\s*(?:2|ii)|cfa\s*l-?2)\b", t):
        course = "CFA L2"
    # CFA Level 1
    elif re.search(r"\b(cfa\s*(?:level|l|lvl)?\s*(?:1|i)|cfa\s*l-?1)\b", t):
        course = "CFA L1"
    # Standalone CFA
    elif "cfa" in t:
        course = "CFA L1"
    # Standalone FRM (e.g. Avoid These 3 Mistakes to Clear FRM, Books for FRM, How to register for FRM)
    elif "frm" in t:
        if "part ii" in t or "part 2" in t:
            course = "FRM Part 2"
        else:
            course = "FRM Part 1"
    else:
        course = "General Prep"

    # -------------------------------------------------------------
    # 2. Topic Classification
    # -------------------------------------------------------------
    if re.search(r"\b(fsa|fra|balance sheet|cash flow|cfo cash|income statement|depreciation|amortization|eps|diluted eps|financial reporting|financial statements?|intercorporate investment)\b", t):
        topic = "Financial Statement Analysis"
    elif re.search(r"\b(swap|swaps|derivative|derivatives|option|options|futures|forward|forwards|bsm|black scholes|greeks|arbitrage|cash and carry|contango|backwardation|hedging|cost of carry|short selling|short squeeze)\b", t):
        topic = "Derivatives"
    elif re.search(r"\b(fixed income|corporate bonds?|bonds?|duration|convexity|yield curve|bootstrapping|interest rate term|mortgage|mbs)\b", t):
        topic = "Fixed Income"
    elif re.search(r"\b(quant|quants|quantitative|random variable|random variables|multivariate|poisson|bernoulli|binomial|probability|sampling|moments|z table|distribution|spearman|kendall|hypothesis|regression|r python|pseudo random|seed value|quantile|interquantile|median|tvm|time value of money|organizing visualizing|conditionally independent|ggplot)\b", t):
        topic = "Quantitative Methods"
    elif re.search(r"\b(equity|equities|gordon growth|ddm|stock valuation|pe ratio|securities valuation)\b", t):
        topic = "Equity Investments"
    elif re.search(r"\b(corporate issuer|corporate issuers|corporate finance|cost of capital|leverage|measures of leverage|wacc|capital structure)\b", t):
        topic = "Corporate Issuers"
    elif re.search(r"\b(credit risk|credit derivative|credit exposure|c27 credit|external and internal rating|rating migration|default risk)\b", t):
        topic = "Credit Risk"
    elif re.search(r"\b(market risk|var\b|value at risk|coherent risk|historicalsimulationvar|volatility|measuring and monitoring volatility|volatility smile)\b", t):
        topic = "Market Risk"
    elif re.search(r"\b(liquidity risk|deposit services|treasury|nsfr|lcr)\b", t):
        topic = "Liquidity & Treasury Risk"
    elif re.search(r"\b(basel|solv ii|operational risk|cyber risk)\b", t):
        topic = "Operational Risk"
    elif re.search(r"\b(portfolio|asset allocation|capm|sharpe ratio|rebalancing)\b", t):
        topic = "Portfolio Management"
    elif re.search(r"\b(econ|economics|currency exchange|cross currency|exchange rates?|fx|forex|inflation|gdp)\b", t):
        topic = "Economics"
    elif re.search(r"\b(anatomy of financial crisis|financial crisis|building blocks of risk|foundations of risk|enterprise risk|erm|green swan|climate change|madoff)\b", t):
        topic = "Risk Management Principles"
    elif re.search(r"\b(calculator|strategy|study plan|study sequence|how to|guide|review|changes|curriculum|syllabus|exam fees|registration|books|salary|preparation|order of preparation|mock|reality check|pass in|announcement|questions to solve|time required|defer|experience submission)\b", t):
        topic = "General / Strategy"
    else:
        topic = "General / Strategy"

    # -------------------------------------------------------------
    # 3. Format Classification
    # -------------------------------------------------------------
    if re.search(r"\b(revision|marathon|crash course|fasttrack|formula revision|recap|last minute)\b", t):
        fmt = "Revision / Marathon"
    elif re.search(r"\b(q&a|doubt|questions?|mock|test|practice papers?|reality check|solution)\b", t):
        fmt = "Doubt-clearing / Q&A"
    elif re.search(r"\b(interview|podcast|discussion|success story|conversation|talk)\b", t):
        fmt = "Discussion / Podcast"
    elif re.search(r"\b(strategy|study plan|sequence|order of preparation|how to|guide|tips|salary|changes|fees|registration|books|defer|experience)\b", t):
        fmt = "Strategy / General"
    else:
        fmt = "Core Lecture"

    return {
        "course": course,
        "topic": topic,
        "format": fmt
    }

if __name__ == "__main__":
    test_cases = [
        "All you need to know about FRM Course 2023",
        "BINOMIAL VS POISSON DISTRIBUTION | FRM PART I",
        "CREDIT RISK AND CREDIT DERIVATIVE PART I | FRM Part II | by CA Janani Gomathi",
        "CFA Level 1 Fixed Income: Duration, Convexity & Key Rate Risks (Full Lecture)",
        "Analysis of Balance Sheet Revision 2024 Session CFA Level 1 FSA",
        "Intercorporate investment Part 1 Investment in financial assets - CFA Level 2 | FSA",
        "Best Calculators for FRM and CFA Exams: A Comprehensive Review",
        "Avoid These 3 Mistakes to Clear FRM in First Attempt #frm"
    ]
    for tc in test_cases:
        print(f"'{tc}'\n  -> {categorize_video(tc)}\n")
