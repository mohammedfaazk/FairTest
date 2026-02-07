import ClientLayout from '../../../../ClientLayout';
import GradeExam from '../../../../../src/pages/evaluator/GradeExam';

export default function GradeExamPage({ params }) {
  return (
    <ClientLayout title="Grade Exam">
      <GradeExam examId={params.examId} />
    </ClientLayout>
  );
}
