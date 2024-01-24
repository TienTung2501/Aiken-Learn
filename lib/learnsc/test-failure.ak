use aiken/math
 
!test must_fail() {
  expect Some(result) = math.sqrt(-42)
  result == -1
}
