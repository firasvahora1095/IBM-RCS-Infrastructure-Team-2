import re
import unittest

from app.case_ids import CASE_ID_LENGTH, generate_case_id


CASE_ID_PATTERN = re.compile(rf"[A-Z0-9]{{{CASE_ID_LENGTH}}}")


class CaseIdTests(unittest.TestCase):
    def test_consecutive_case_ids_are_distinct_and_well_formed(self) -> None:
        first = generate_case_id()
        second = generate_case_id()

        self.assertNotEqual(first, second)
        self.assertIsNotNone(CASE_ID_PATTERN.fullmatch(first))
        self.assertIsNotNone(CASE_ID_PATTERN.fullmatch(second))

    def test_case_ids_do_not_collide_in_sample(self) -> None:
        sample_size = 10_000
        generated = {generate_case_id() for _ in range(sample_size)}

        self.assertEqual(len(generated), sample_size)


if __name__ == "__main__":
    unittest.main()
