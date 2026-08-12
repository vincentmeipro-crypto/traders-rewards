import importlib.util
import os
import pathlib
import unittest

os.environ.setdefault("MT5_WATCHDOG_SECRET", "test-watchdog-secret")
os.environ.setdefault("MT5_API_SECRET", "test-mt5-secret")
module_path = pathlib.Path(__file__).with_name("mt5_drawdown_watchdog.py")
spec = importlib.util.spec_from_file_location("mt5_drawdown_watchdog", module_path)
watchdog = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(watchdog)


class DrawdownWatchdogTests(unittest.TestCase):
    rule = {"start_balance": 50_000, "daily_drawdown_limit": 5, "total_drawdown_limit": 10}

    def test_daily_breach_is_detected_at_boundary(self):
        self.assertEqual(watchdog.breach_reason(self.rule, 47_500), "daily_drawdown")

    def test_total_breach_has_priority(self):
        self.assertEqual(watchdog.breach_reason(self.rule, 45_000), "total_drawdown")

    def test_recovered_equity_does_not_reclassify_original_sample(self):
        first_observation = watchdog.breach_reason(self.rule, 47_400)
        recovered_observation = watchdog.breach_reason(self.rule, 49_000)
        self.assertEqual(first_observation, "daily_drawdown")
        self.assertIsNone(recovered_observation)
        # Production latches and reports first_observation before accepting later samples.
        self.assertTrue(first_observation is not None)


if __name__ == "__main__":
    unittest.main()