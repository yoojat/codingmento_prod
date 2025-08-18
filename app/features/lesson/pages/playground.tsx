import PythonEditor from "../components/python-editor";

export default function Playground() {
  const handleCodeChange = (code: string) => {
    // 코드 변경 시 추가 로직이 필요하면 여기에 구현
    console.log("Code changed:", code);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Python 플레이그라운드
        </h1>
        <p className="text-gray-600 mt-2">
          Python 코드를 작성하고 실행해보세요. Turtle 그래픽도 지원합니다.
        </p>
      </div>

      <PythonEditor
        initialCode={`# Python 코드를 작성해보세요!
print("Hello, World!")

# Turtle 그래픽 예제
# import turtle
# t = turtle.Turtle()
# t.forward(100)
# t.right(90)
# t.forward(100)`}
        onCodeChange={handleCodeChange}
        height="400px"
        className="w-full"
      />
    </div>
  );
}
